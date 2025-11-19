import type { Meta, StoryObj } from '@storybook/react'
import CopilotChat from '../components/CopilotChat/CopilotChat'

const meta: Meta<typeof CopilotChat> = { title: 'CopilotChat', component: CopilotChat }
export default meta
export type Story = StoryObj<typeof CopilotChat>

export const Default: Story = {}