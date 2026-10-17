import client from './client'

const getLeads = (id) => client.get(`/leads/${id}`)
const addLead = (body) => client.post(`/leads/`, body)
const testMailchimp = (body) => client.post(`/leads/test-mailchimp`, body)

export default {
    getLeads,
    addLead,
    testMailchimp
}
