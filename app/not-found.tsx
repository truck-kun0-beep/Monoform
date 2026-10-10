import { Button, Container, EmptyState } from "@/components/ui";
import { messages } from "@/config/messages";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <Container as="section" className="py-section">
      <EmptyState
        title={messages.notFound.title}
        body={messages.notFound.body}
        action={messages.notFound.action}
      />
      <div className="mt-8">
        <Button href="/" variant="secondary">
          Return home
        </Button>
      </div>
    </Container>
  );
}
