import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Button, Box, OutlinedInput, Typography, Divider, Alert } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
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
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDark = theme.palette.mode === 'dark' || customization?.isDarkMode

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
        if (!mc?.credentialId || !mc?.audienceId) return
        try {
            setIsTesting(true)
            setTestResult(null)
            const resp = await leadsApi.testMailchimp({
                credentialId: mc.credentialId,
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
        leadsConfig?.mailchimp?.status &&
        (!leadsConfig?.mailchimp?.credentialId || !leadsConfig?.mailchimp?.audienceId || !leadsConfig?.email)

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

                        <Divider sx={{ width: '100%', my: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'divider' }} />
                        <Typography variant='h4' sx={{ color: isDark ? 'text.primary' : 'inherit', fontWeight: 600 }}>
                            Email Campaigns (Mailchimp)
                        </Typography>
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
                                    <Typography variant='body2' sx={{ fontWeight: 500, color: isDark ? 'text.secondary' : 'inherit' }}>
                                        Connect Credential *
                                    </Typography>
                                    <CredentialInputHandler
                                        key={leadsConfig?.mailchimp?.credentialId}
                                        data={
                                            leadsConfig?.mailchimp?.credentialId ? { credential: leadsConfig.mailchimp.credentialId } : {}
                                        }
                                        inputParam={{
                                            label: 'Mailchimp Credential',
                                            name: 'credential',
                                            type: 'credential',
                                            credentialNames: ['mailchimpApi']
                                        }}
                                        onSelect={(newValue) => handleMailchimpChange('credentialId', newValue)}
                                    />
                                </Box>
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant='body2' sx={{ fontWeight: 500, color: isDark ? 'text.secondary' : 'inherit' }}>
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
                                    <Typography variant='body2' sx={{ fontWeight: 500, color: isDark ? 'text.secondary' : 'inherit' }}>
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
                                    <Typography variant='body2' sx={{ fontWeight: 500, color: isDark ? 'text.secondary' : 'inherit' }}>
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
                                        disabled={!leadsConfig?.mailchimp?.credentialId || !leadsConfig?.mailchimp?.audienceId || isTesting}
                                        sx={{
                                            borderRadius: '8px',
                                            px: 2,
                                            py: 0.75,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            transition: 'all 0.2s ease-in-out',
                                            ...(isDark
                                                ? {
                                                      color: '#90caf9',
                                                      borderColor: 'rgba(144, 202, 249, 0.45)',
                                                      backgroundColor: 'rgba(33, 150, 243, 0.08)',
                                                      '&:hover': {
                                                          borderColor: '#90caf9',
                                                          backgroundColor: 'rgba(33, 150, 243, 0.18)'
                                                      },
                                                      '&.Mui-disabled': {
                                                          color: 'rgba(255, 255, 255, 0.35) !important',
                                                          borderColor: 'rgba(255, 255, 255, 0.15) !important',
                                                          backgroundColor: 'rgba(255, 255, 255, 0.03) !important'
                                                      }
                                                  }
                                                : {
                                                      '&.Mui-disabled': {
                                                          color: 'rgba(0, 0, 0, 0.26) !important',
                                                          borderColor: 'rgba(0, 0, 0, 0.12) !important'
                                                      }
                                                  })
                                        }}
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 3, pb: 1 }}>
                <StyledButton
                    disabled={
                        (!leadsConfig['name'] && !leadsConfig['phone'] && !leadsConfig['email'] && leadsConfig['status']) ||
                        isMailchimpIncomplete
                    }
                    variant='contained'
                    onClick={onSave}
                    sx={{
                        minWidth: 100,
                        ...(isDark && {
                            '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.35) !important',
                                backgroundColor: 'rgba(255, 255, 255, 0.12) !important'
                            }
                        })
                    }}
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
