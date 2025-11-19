import Timeline from '../components/Timeline/Timeline'
import { useNavigate } from 'react-router-dom'

export default function TimelinePage(){
  const nav = useNavigate()
  return <Timeline onOpen={(id)=> nav(`/memory/${id}`)} />
}