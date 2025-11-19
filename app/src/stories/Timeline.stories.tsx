import type { Meta, StoryObj } from '@storybook/react'
import Timeline from '../components/Timeline/Timeline'

const meta: Meta<typeof Timeline> = { title: 'Timeline', component: Timeline }
export default meta
export type Story = StoryObj<typeof Timeline>

export const Default: Story = { args: { initialLoadCount: 50, onOpen: ()=>{} } }
export const Loading: Story = { args: { initialLoadCount: 0, onOpen: ()=>{} } }