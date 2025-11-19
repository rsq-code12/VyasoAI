import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Timeline from '../components/Timeline/Timeline'

test('opens a timeline card', async()=>{
  const onOpen = jest.fn()
  render(<Timeline onOpen={onOpen} />)
  const btn = await screen.findByRole('button', { name: 'Open' })
  fireEvent.click(btn)
  expect(onOpen).toHaveBeenCalled()
})