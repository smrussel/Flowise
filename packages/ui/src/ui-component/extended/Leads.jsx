import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box, OutlinedInput, Typography, Divider, Alert } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'
import leadsApi from '@/api/lead'

const formTitle = `Hey 👋 thanks for your interest!
Let us know where we can reach you`

const endTitle = `Thank you!
What can I do for you?`

const Leads = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [leadsConfig, setLeadsConfig] = useState({})
    const [chatbotConfig, setChatbotConfig] = useState({})
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState(null)

    const handleChange = (key, value) => {
        setLeadsConfig({
            ...leadsConfig,
            [key]: value
        })
    }

    const handleMailchimpChange = (field, value) => {
        const updatedConfig = {
            ...leadsConfig,
            mailchimp: {
                ...(leadsConfig.mailchimp || {}),
                [field]: value
            }
        }
        if (field === 'status' && value && !updatedConfig.email) {
            updatedConfig.email = true
        }
        setLeadsConfig(updatedConfig)
        setTestResult(null)
    }

    const handleTestMailchimp = async () => {
        const mc = leadsConfig?.mailchimp
        if (!mc?.apiKey || !mc?.audienceId) return
        try {
            setIsTesting(true)
            setTestResult(null)
            const resp = await leadsApi.testMailchimp({
                apiKey: mc.apiKey,
                audienceId: mc.audienceId,
                serverPrefix: mc.serverPrefix
            })
            if (resp.data?.success) {
                setTestResult({
                    success: true,
                    message: `Connected successfully to audience "${resp.data.name}" (${resp.data.totalSubscribers} members). Data center: ${resp.data.serverPrefix}`
                })
            } else {
                setTestResult({
                    success: false,
                    message: resp.data?.message || 'Failed to connect to Mailchimp'
                })
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error.response?.data?.message || error.message || 'Connection test failed'
            })
        } finally {
            setIsTesting(false)
        }
    }

    const onSave = async () => {
        try {
            let value = {
                leads: leadsConfig
            }
            chatbotConfig.leads = value.leads
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Leads configuration Saved',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Leads configuration: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            setChatbotConfig(chatbotConfig || {})
            if (chatbotConfig.leads) {
                setLeadsConfig(chatbotConfig.leads)
            }
        }

        return () => {}
    }, [dialogProps])

    const isMailchimpIncomplete =
        leadsConfig?.mailchimp?.status && (!leadsConfig?.mailchimp?.apiKey || !leadsConfig?.mailchimp?.audienceId || !leadsConfig?.email)

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'start',
                    gap: 3,
                    mb: 2
                }}
            >
                <SwitchInput label='Enable Lead Capture' onChange={(value) => handleChange('status', value)} value={leadsConfig.status} />
                {leadsConfig && leadsConfig['status'] && (
                    <>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                            <Typography>Form Title</Typography>
                            <OutlinedInput
                                id='form-title'
                                type='text'
                                fullWidth
                                multiline={true}
                                minRows={4}
                                value={leadsConfig.title}
                                placeholder={formTitle}
                                name='form-title'
                                size='small'
                                onChange={(e) => {
                                    handleChange('title', e.target.value)
                                }}
                            />
                        </Box>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                            <Typography>Message after lead captured</Typography>
                            <OutlinedInput
                                id='success-message'
                                type='text'
                                fullWidth
                                multiline={true}
                                minRows={4}
                                value={leadsConfig.successMessage}
                                placeholder={endTitle}
                                name='form-title'
                                size='small'
                                onChange={(e) => {
                                    handleChange('successMessage', e.target.value)
                                }}
                            />
                        </Box>
                        <Typography variant='h4'>Form fields</Typography>
                        <Box sx={{ width: '100%' }}>
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                <SwitchInput label='Name' onChange={(value) => handleChange('name', value)} value={leadsConfig.name} />
                                <SwitchInput
                                    label='Email Address'
                                    onChange={(value) => handleChange('email', value)}
                                    value={leadsConfig.email}
                                />
                                <SwitchInput label='Phone' onChange={(value) => handleChange('phone', value)} value={leadsConfig.phone} />
                            </Box>
                        </Box>

                        <Divider sx={{ width: '100%', my: 1 }} />
                        <Typography variant='h4'>Email Campaigns (Mailchimp)</Typography>
                        <SwitchInput
                            label='Sync Leads to Mailchimp'
                            onChange={(value) => handleMailchimpChange('status', value)}
                            value={leadsConfig?.mailchimp?.status}
                        />
                        {leadsConfig?.mailchimp?.status && (
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, pl: 1 }}>
                                {!leadsConfig?.email && (
                                    <Alert severity='warning' sx={{ width: '100%' }}>
                                        Email capture must be enabled above because Mailchimp requires an email address for each subscriber.
                                    </Alert>
                                )}
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        Mailchimp API Key *
                                    </Typography>
                                    <OutlinedInput
                                        id='mailchimp-api-key'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        value={leadsConfig?.mailchimp?.apiKey || ''}
                                        placeholder='e.g. md5hash-us20'
                                        onChange={(e) => handleMailchimpChange('apiKey', e.target.value)}
                                    />
                                </Box>
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        Audience / List ID *
                                    </Typography>
                                    <OutlinedInput
                                        id='mailchimp-audience-id'
                                        type='text'
                                        fullWidth
                                        size='small'
                                        value={leadsConfig?.mailchimp?.audienceId || ''}
                                        placeholder='e.g. 205d96e6b4'
                                        onChange={(e) => handleMailchimpChange('audienceId', e.target.value)}
                                    />
                                </Box>
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        Server Prefix (Optional)
                                    </Typography>
                                    <OutlinedInput
                                        id='mailchimp-server-prefix'
                                        type='text'
                                        fullWidth
                                        size='small'
                                        value={leadsConfig?.mailchimp?.serverPrefix || ''}
                                        placeholder='e.g. us20 (auto-extracted from API key if left blank)'
                                        onChange={(e) => handleMailchimpChange('serverPrefix', e.target.value)}
                                    />
                                </Box>
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        Tags (Optional)
                                    </Typography>
                                    <OutlinedInput
                                        id='mailchimp-tags'
                                        type='text'
                                        fullWidth
                                        size='small'
                                        value={leadsConfig?.mailchimp?.tags || ''}
                                        placeholder='e.g. flowise, chatbot-lead (comma separated)'
                                        onChange={(e) => handleMailchimpChange('tags', e.target.value)}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                    <Button
                                        variant='outlined'
                                        size='small'
                                        onClick={handleTestMailchimp}
                                        disabled={!leadsConfig?.mailchimp?.apiKey || !leadsConfig?.mailchimp?.audienceId || isTesting}
                                        sx={{ borderRadius: '8px' }}
                                    >
                                        {isTesting ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    {testResult && (
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: testResult.success ? 'success.main' : 'error.main',
                                                fontWeight: 500
                                            }}
                                        >
                                            {testResult.message}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton
                    disabled={
                        (!leadsConfig['name'] && !leadsConfig['phone'] && !leadsConfig['email'] && leadsConfig['status']) ||
                        isMailchimpIncomplete
                    }
                    variant='contained'
                    onClick={onSave}
                    sx={{ minWidth: 100 }}
                >
                    Save
                </StyledButton>
            </Box>
        </>
    )
}

Leads.propTypes = {
    dialogProps: PropTypes.object
}

export default Leads
