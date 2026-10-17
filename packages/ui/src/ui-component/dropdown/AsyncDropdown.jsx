import { useState, useEffect, useContext, Fragment } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import axios from 'axios'

// Material
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete'
import { Popper, CircularProgress, TextField, Box, Typography, Tooltip } from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'

// API
import credentialsApi from '@/api/credentials'

// const
import { baseURL } from '@/store/constant'
import { flowContext } from '@/store/context/ReactFlowContext'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'

const StyledPopper = styled(Popper)({
    boxShadow: '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)',
    borderRadius: '10px',
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 10,
            margin: 10
        }
    }
})

const fetchList = async ({ name, nodeData, previousNodes, currentNode }) => {
    const selectedParam = nodeData.inputParams.find((param) => param.name === name)
    const loadMethod = selectedParam?.loadMethod

    let credentialId = nodeData.credential
    if (!credentialId && (nodeData.inputs?.credential || nodeData.inputs?.['FLOWISE_CREDENTIAL_ID'])) {
        credentialId = nodeData.inputs.credential || nodeData.inputs?.['FLOWISE_CREDENTIAL_ID']
    }

    let config = {
        headers: {
            'x-request-from': 'internal',
            'Content-type': 'application/json'
        },
        withCredentials: true
    }

    try {
        let response = await axios.post(
            `${baseURL}/api/v1/node-load-method/${nodeData.name}`,
            { ...nodeData, loadMethod, previousNodes, currentNode, credential: credentialId },
            config
        )
        return Array.isArray(response.data) ? response.data : []
    } catch (error) {
        console.error(error)
        return []
    }
}

export const AsyncDropdown = ({
    name,
    nodeData,
    value,
    onSelect,
    isCreateNewOption,
    onCreateNew,
    credentialNames = [],
    disabled = false,
    freeSolo = false,
    disableClearable = false,
    multiple = false,
    fullWidth = false
}) => {
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()

    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)
    let [internalValue, setInternalValue] = useState(value ?? 'choose an option')
    const { reactFlowInstance } = useContext(flowContext)

    useEffect(() => {
        setInternalValue(value ?? 'choose an option')
    }, [value])

    const findMatchingOptions = (options = [], val) => {
        if (!val || val === 'choose an option') return multiple ? [] : null
        if (multiple) {
            let values = []
            if (val && typeof val === 'string') {
                try {
                    values = JSON.parse(val)
                } catch {
                    values = [val]
                }
            } else if (Array.isArray(val)) {
                values = val
            }
            return options.filter((option) => values.includes(option.name))
        }
        const found = options.find((option) => option.name === val || option.label === val)
        if (found) return found
        if (freeSolo && val) {
            return { label: val, name: val }
        }
        return null
    }
    const getDefaultOptionValue = () => (multiple ? [] : null)
    const addNewOption = [{ label: '- Create New -', name: '-create-' }]

    const fetchCredentialList = async () => {
        try {
            let names = ''
            if (credentialNames.length > 1) {
                names = credentialNames.join('&credentialName=')
            } else {
                names = credentialNames[0]
            }
            const resp = await credentialsApi.getCredentialsByName(names)
            if (resp.data) {
                const returnList = []
                for (let i = 0; i < resp.data.length; i += 1) {
                    const data = {
                        label: resp.data[i].name,
                        name: resp.data[i].id
                    }
                    returnList.push(data)
                }
                return returnList
            }
        } catch (error) {
            console.error(error)
        }
    }

    const activeCredential = nodeData.credential || nodeData.inputs?.credential || nodeData.inputs?.['FLOWISE_CREDENTIAL_ID']

    useEffect(() => {
        setLoading(true)
        ;(async () => {
            const fetchData = async () => {
                let response = []
                if (credentialNames.length) {
                    response = await fetchCredentialList()
                } else {
                    const body = {
                        name,
                        nodeData
                    }
                    if (reactFlowInstance) {
                        const previousNodes = getAvailableNodesForVariable(
                            reactFlowInstance.getNodes(),
                            reactFlowInstance.getEdges(),
                            nodeData.id,
                            `${nodeData.id}-input-${name}-${nodeData.inputParams.find((param) => param.name === name)?.type || ''}`,
                            true
                        ).map((node) => ({ id: node.id, name: node.data.name, label: node.data.label, inputs: node.data.inputs }))

                        let currentNode = reactFlowInstance.getNodes().find((node) => node.id === nodeData.id)
                        if (currentNode) {
                            currentNode = {
                                id: currentNode.id,
                                name: currentNode.data.name,
                                label: currentNode.data.label,
                                inputs: currentNode.data.inputs
                            }
                            body.currentNode = currentNode
                        }

                        body.previousNodes = previousNodes
                    }

                    response = await fetchList(body)
                }
                if (Array.isArray(response)) {
                    for (let j = 0; j < response.length; j += 1) {
                        if (response[j].imageSrc) {
                            const imageSrc = `${baseURL}/api/v1/node-icon/${response[j].name}`
                            response[j].imageSrc = imageSrc
                        }
                    }
                    if (isCreateNewOption) setOptions([...response, ...addNewOption])
                    else setOptions([...response])
                }
                setLoading(false)
            }
            fetchData()
        })()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCredential])

    return (
        <>
            <Autocomplete
                id={name}
                freeSolo={freeSolo}
                disabled={disabled}
                disableClearable={disableClearable}
                multiple={multiple}
                filterSelectedOptions={multiple}
                size='small'
                sx={{ mt: 1, width: fullWidth ? '100%' : multiple ? '90%' : '100%' }}
                open={open}
                onOpen={() => {
                    setOpen(true)
                }}
                onClose={() => {
                    setOpen(false)
                }}
                openOnFocus
                selectOnFocus
                clearOnBlur={false}
                options={options}
                value={findMatchingOptions(options, internalValue) || getDefaultOptionValue()}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    return option?.label || option?.name || ''
                }}
                isOptionEqualToValue={(option, val) => {
                    if (!val) return false
                    const valName = typeof val === 'string' ? val : val.name
                    return option.name === valName || option.label === valName
                }}
                filterOptions={(optionsList, state) => {
                    const input = (state.inputValue || '').trim().toLowerCase()
                    if (!input || input === 'choose an option') {
                        return optionsList
                    }
                    const selected = findMatchingOptions(optionsList, internalValue)
                    if (selected && !multiple) {
                        const selLabel = (selected.label || '').toLowerCase()
                        const selName = (selected.name || '').toLowerCase()
                        if (input === selLabel || input === selName) {
                            return optionsList
                        }
                    }
                    return optionsList.filter((option) => {
                        const label = (option.label || '').toLowerCase()
                        const optName = (option.name || '').toLowerCase()
                        const desc = (option.description || '').toLowerCase()
                        return label.includes(input) || optName.includes(input) || desc.includes(input)
                    })
                }}
                onChange={(e, selection) => {
                    if (multiple) {
                        let val = ''
                        if (selection && selection.length) {
                            const selectionNames = selection.map((item) => (typeof item === 'string' ? item : item.name))
                            val = JSON.stringify(selectionNames)
                        }
                        setInternalValue(val)
                        onSelect(val)
                    } else {
                        const val = selection ? (typeof selection === 'string' ? selection : selection.name) : ''
                        if (isCreateNewOption && val === '-create-') {
                            onCreateNew()
                        } else {
                            setInternalValue(val)
                            onSelect(val)
                        }
                    }
                }}
                PopperComponent={StyledPopper}
                loading={loading}
                renderInput={(params) => {
                    const matchingOptions = multiple
                        ? findMatchingOptions(options, internalValue) || []
                        : [findMatchingOptions(options, internalValue)].filter(Boolean)

                    const isPlaceholder = !internalValue || internalValue === 'choose an option'

                    const textField = (
                        <TextField
                            {...params}
                            placeholder={isPlaceholder ? 'Choose an option' : ''}
                            onClick={() => {
                                if (!open) setOpen(true)
                            }}
                            sx={{
                                height: '100%',
                                '& .MuiInputBase-root': {
                                    height: '100%',
                                    '& fieldset': {
                                        borderColor: theme.palette.grey[900] + 25
                                    }
                                }
                            }}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <>
                                        {matchingOptions.map((option) =>
                                            option?.imageSrc ? (
                                                <Box
                                                    key={option.name}
                                                    component='img'
                                                    src={option.imageSrc}
                                                    alt={option.label || 'Selected Option'}
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        marginRight: 0.5
                                                    }}
                                                />
                                            ) : null
                                        )}
                                        {params.InputProps.startAdornment}
                                    </>
                                ),
                                endAdornment: (
                                    <Fragment>
                                        {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </Fragment>
                                )
                            }}
                        />
                    )

                    return !multiple ? (
                        textField
                    ) : (
                        <Tooltip
                            title={
                                typeof internalValue === 'string' ? internalValue.replace(/[[\]"]/g, '').replace(/,/g, ', ') : internalValue
                            }
                            placement='top'
                            arrow
                        >
                            {textField}
                        </Tooltip>
                    )
                }}
                renderOption={(props, option) => (
                    <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option.imageSrc && (
                            <img
                                src={option.imageSrc}
                                alt={option.description}
                                style={{
                                    width: 30,
                                    height: 30,
                                    padding: 1,
                                    borderRadius: '50%'
                                }}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='h5'>{option.label}</Typography>
                            {option.description && (
                                <Typography sx={{ color: customization.isDarkMode ? '#9e9e9e' : '' }}>{option.description}</Typography>
                            )}
                        </div>
                    </Box>
                )}
            />
        </>
    )
}

AsyncDropdown.propTypes = {
    name: PropTypes.string,
    nodeData: PropTypes.object,
    value: PropTypes.string,
    onSelect: PropTypes.func,
    onCreateNew: PropTypes.func,
    disabled: PropTypes.bool,
    freeSolo: PropTypes.bool,
    credentialNames: PropTypes.array,
    disableClearable: PropTypes.bool,
    isCreateNewOption: PropTypes.bool,
    multiple: PropTypes.bool,
    fullWidth: PropTypes.bool
}
