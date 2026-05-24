import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/three')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/three"!</div>
}
