import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonVariants } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

// Dashboard / page section: a titled card with an optional "View all" link
// or any custom action on the right.
export function SectionCard({
  title,
  description,
  viewAllTo,
  action,
  contentClassName,
  children,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}

        {(viewAllTo || action) && (
          <CardAction>
            {action ?? (
              <Link
                to={viewAllTo}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                View all <ArrowUpRight />
              </Link>
            )}
          </CardAction>
        )}
      </CardHeader>

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
