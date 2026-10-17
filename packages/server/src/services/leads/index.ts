import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import crypto from 'crypto'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Lead } from '../../database/entities/Lead'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ILead } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import logger from '../../utils/logger'

interface IMailchimpLeadPayload {
    email: string
    name?: string
    phone?: string
}

export const syncLeadToMailchimp = async (chatflowid: string, lead: IMailchimpLeadPayload) => {
    try {
        if (!chatflowid || !lead.email) return

        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: chatflowid })
        if (!chatflow?.chatbotConfig) return

        let chatbotConfig: any = {}
        try {
            chatbotConfig = JSON.parse(chatflow.chatbotConfig)
        } catch {
            return
        }

        const mailchimp = chatbotConfig?.leads?.mailchimp
        if (!mailchimp?.status || !mailchimp?.apiKey || !mailchimp?.audienceId) {
            return
        }

        const apiKey = mailchimp.apiKey.trim()
        const audienceId = mailchimp.audienceId.trim()

        let serverPrefix = mailchimp.serverPrefix?.trim()
        if (!serverPrefix && apiKey.includes('-')) {
            serverPrefix = apiKey.split('-').pop()?.trim()
        }
        if (!serverPrefix) {
            logger.warn(`[Mailchimp]: Server prefix could not be determined for chatflow ${chatflowid}`)
            return
        }

        const subscriberHash = crypto.createHash('md5').update(lead.email.toLowerCase().trim()).digest('hex')
        const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`

        const mergeFields: Record<string, string> = {}
        if (lead.name && lead.name.trim()) {
            const parts = lead.name.trim().split(/\s+/)
            mergeFields.FNAME = parts[0]
            if (parts.length > 1) {
                mergeFields.LNAME = parts.slice(1).join(' ')
            }
        }
        if (lead.phone && lead.phone.trim()) {
            mergeFields.PHONE = lead.phone.trim()
        }

        const tags: string[] = []
        if (mailchimp.tags && typeof mailchimp.tags === 'string') {
            tags.push(
                ...mailchimp.tags
                    .split(',')
                    .map((t: string) => t.trim())
                    .filter(Boolean)
            )
        }

        const payload: any = {
            email_address: lead.email.toLowerCase().trim(),
            status_if_new: mailchimp.statusIfNew || 'subscribed',
            merge_fields: mergeFields
        }
        if (tags.length > 0) {
            payload.tags = tags
        }

        const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`
        let response
        try {
            response = await axios.put(url, payload, {
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            })
        } catch (err: any) {
            // If Mailchimp rejected due to merge fields (e.g. PHONE merge tag not defined in audience), retry without PHONE
            if (payload.merge_fields?.PHONE && err.response?.status === 400) {
                logger.warn(`[Mailchimp]: Initial sync rejected for ${lead.email}. Retrying without PHONE merge field.`)
                delete payload.merge_fields.PHONE
                response = await axios.put(url, payload, {
                    headers: {
                        Authorization: authHeader,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                })
            } else {
                throw err
            }
        }

        logger.info(`[Mailchimp]: Lead ${lead.email} successfully synced to audience ${audienceId} in chatflow ${chatflowid}`)
        return response.data
    } catch (error: any) {
        const errorDetail = error.response?.data?.detail || error.response?.data?.title || error.message
        logger.error(`[Mailchimp]: Failed to sync lead ${lead.email} for chatflow ${chatflowid}: ${errorDetail}`)
    }
}

export const testMailchimpConnection = async ({
    apiKey,
    audienceId,
    serverPrefix
}: {
    apiKey: string
    audienceId: string
    serverPrefix?: string
}) => {
    try {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('Mailchimp API key is required')
        }
        if (!audienceId || !audienceId.trim()) {
            throw new Error('Audience / List ID is required')
        }

        const cleanKey = apiKey.trim()
        const cleanAudienceId = audienceId.trim()

        let dc = serverPrefix?.trim()
        if (!dc && cleanKey.includes('-')) {
            dc = cleanKey.split('-').pop()?.trim()
        }
        if (!dc) {
            throw new Error('Could not determine Mailchimp server prefix (e.g. us20). Please provide Server Prefix.')
        }

        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${cleanAudienceId}`
        const authHeader = `Basic ${Buffer.from(`anystring:${cleanKey}`).toString('base64')}`

        const response = await axios.get(url, {
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        })

        return {
            success: true,
            name: response.data?.name,
            totalSubscribers: response.data?.stats?.member_count ?? 0,
            serverPrefix: dc
        }
    } catch (error: any) {
        const detail = error.response?.data?.detail || error.response?.data?.title || error.message
        return {
            success: false,
            message: detail
        }
    }
}

const getAllLeads = async (chatflowid: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Lead).find({
            where: {
                chatflowid
            }
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: leadsService.getAllLeads - ${getErrorMessage(error)}`)
    }
}

const createLead = async (body: Partial<ILead>) => {
    try {
        const chatId = body.chatId ?? uuidv4()

        const newLead = new Lead()
        // Whitelist allowed fields to prevent mass assignment vulnerability
        // Only copy explicitly allowed fields from request body
        const allowedFields: (keyof ILead)[] = ['chatflowid', 'name', 'email', 'phone']
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                newLead[field] = body[field] as any
            }
        }
        // Set chatId explicitly (either from body or auto-generated)
        newLead.chatId = chatId

        const appServer = getRunningExpressApp()
        const lead = appServer.AppDataSource.getRepository(Lead).create(newLead)
        const dbResponse = await appServer.AppDataSource.getRepository(Lead).save(lead)

        // Trigger background sync to Mailchimp if configured
        if (dbResponse && body.chatflowid && body.email) {
            syncLeadToMailchimp(body.chatflowid, {
                email: body.email,
                name: body.name,
                phone: body.phone
            }).catch((err) => {
                logger.error(`[Mailchimp]: Unexpected error in background sync: ${getErrorMessage(err)}`)
            })
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: leadsService.createLead - ${getErrorMessage(error)}`)
    }
}

export default {
    createLead,
    getAllLeads,
    syncLeadToMailchimp,
    testMailchimpConnection
}
