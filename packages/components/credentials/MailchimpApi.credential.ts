import { INodeParams, INodeCredential } from '../src/Interface'

class MailchimpApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Mailchimp API'
        this.name = 'mailchimpApi'
        this.version = 1.0
        this.description = 'Mailchimp API key used to sync captured chatbot leads to audience subscriber lists'
        this.inputs = [
            {
                label: 'Mailchimp API Key',
                name: 'mailchimpApiKey',
                type: 'password',
                placeholder: 'e.g. md5hash-us20',
                description: 'Mailchimp API Key generated from Account > Extras > API keys'
            }
        ]
    }
}

module.exports = { credClass: MailchimpApi }
