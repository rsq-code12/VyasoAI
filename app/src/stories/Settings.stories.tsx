import type { Meta, StoryObj } from '@storybook/react'
import Settings from '../components/Settings/Settings'

const meta: Meta<typeof Settings> = { title: 'Settings', component: Settings }
export default meta
export type Story = StoryObj<typeof Settings>

export const Default: Story = {}