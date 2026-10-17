import { styled } from '@mui/material/styles'
import { Button } from '@mui/material'
import MuiToggleButton from '@mui/material/ToggleButton'

export const StyledButton = styled(Button)(({ theme, color = 'primary' }) => {
    const isDark = theme.palette.mode === 'dark' || theme.customization?.isDarkMode
    return {
        color: 'white',
        backgroundColor: theme.palette[color].main,
        '&:hover': {
            backgroundColor: theme.palette[color].main,
            backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
        },
        '&.Mui-disabled': {
            color: isDark ? 'rgba(255, 255, 255, 0.35) !important' : 'rgba(0, 0, 0, 0.26) !important',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12) !important' : 'rgba(0, 0, 0, 0.12) !important'
        }
    }
})

export const StyledToggleButton = styled(MuiToggleButton)(({ theme, color = 'primary' }) => ({
    '&.Mui-selected, &.Mui-selected:hover': {
        color: 'white',
        backgroundColor: theme.palette[color].main
    }
}))
