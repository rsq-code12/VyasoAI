import type { Meta, StoryObj } from '@storybook/react'
import GlobalSearch from '../components/GlobalSearch/GlobalSearch'

const meta: Meta<typeof GlobalSearch> = { title: 'GlobalSearch', component: GlobalSearch }
export default meta
export type Story = StoryObj<typeof GlobalSearch>

export const Default: Story = {}