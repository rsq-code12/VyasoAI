import type { Meta, StoryObj } from '@storybook/react'
import MemoryViewer from '../components/MemoryViewer/MemoryViewer'

const meta: Meta<typeof MemoryViewer> = { title: 'MemoryViewer', component: MemoryViewer }
export default meta
export type Story = StoryObj<typeof MemoryViewer>

export const Default: Story = { args: { memoryId: 'mem-1' } }