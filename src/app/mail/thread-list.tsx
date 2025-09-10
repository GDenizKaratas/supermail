"use client";
import useThreads from "@/hooks/use-threads";
import DOMPurify from "dompurify";
import React, { type ComponentProps } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const ThreadList = () => {
  const { threads, threadId, setThreadId } = useThreads();

  console.log("threads", threads);
  const groupedThreads = threads?.reduce(
    (acc, thread) => {
      const date = format(thread.emails[0]?.sentAt ?? new Date(), "yyyy-MM-dd");

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(thread);
      return acc;
    },
    {} as Record<string, typeof threads>,
  );

  console.log("groupedThreads", groupedThreads);

  return (
    <div className="max-h-[calc(100vh-120px)] max-w-full overflow-y-scroll">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {Object.entries(groupedThreads ?? {}).map(([date, threads]) => {
          return (
            <React.Fragment key={date}>
              <div className="text-muted-foreground mt-5 text-sm font-medium first:mt-0">
                {date}
              </div>
              {threads.map((thread) => (
                <button
                  onClick={() => setThreadId(thread.id)}
                  key={thread.id}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all",
                    { "bg-accent": thread.id === threadId },
                  )}
                >
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">
                        {thread.emails.at(-1)?.from.name}
                      </div>
                      <div className={cn("ml-auto text-sm")}>
                        {formatDistanceToNow(
                          thread.emails.at(-1)?.sentAt ?? new Date(),
                          {
                            addSuffix: true,
                            locale: tr,
                          },
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-medium">{thread.subject}</div>
                  </div>
                  <div
                    className="text-muted-foreground line-clamp-2 text-xs"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        thread.emails.at(-1)?.bodySnippet ?? "",
                        {
                          USE_PROFILES: { html: true },
                        },
                      ),
                    }}
                  ></div>
                  {thread.emails[0]?.sysLabels.length ? (
                    <div className="flex items-center gap-2">
                      {thread.emails.at(0)?.sysLabels.map((label) => (
                        <Badge
                          key={label}
                          variant={getBadgeVariantFromLabel(label)}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

function getBadgeVariantFromLabel(
  label: string,
): ComponentProps<typeof Badge>["variant"] {
  if (["work"].includes(label.toLowerCase())) {
    return "default";
  }

  if (["personal"].includes(label.toLowerCase())) {
    return "outline";
  }

  return "secondary";
}

export default ThreadList;
