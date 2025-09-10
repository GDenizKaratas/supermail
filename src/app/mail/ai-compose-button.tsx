/* eslint-disable @typescript-eslint/no-floating-promises */
"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot } from "lucide-react";
import { generateEmail } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import useThreads from "@/hooks/use-threads";
import { turndown } from "@/lib/turndown";

type Props = {
  isComposing: boolean;
  onGenerate: (token: string) => void;
};

const AiComposeButton = ({ isComposing, onGenerate }: Props) => {
  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const { threads, threadId, account } = useThreads();
  const thread = threads?.find((t) => t.id === threadId);

  const aiGenerate = async () => {
    let context: string | undefined = "";

    if (!isComposing) {
      context = thread?.emails
        .map(
          (m) =>
            `Subject: ${m.subject}\nFrom: ${m.from.address}\n\n${turndown.turndown(m.body ?? m.bodySnippet ?? "")}`,
        )
        .join("\n");
    }

    console.log("ACCOUNT", account);
    const { output } = await generateEmail(
      context + `\n\nMy name is: ${account?.name}`,
      prompt,
    );

    for await (const token of readStreamableValue(output)) {
      if (token) {
        console.log("token");
        onGenerate(token);
      }
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} size="icon" variant={"outline"}>
          <Bot className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Compose</DialogTitle>
          <DialogDescription>
            AI will compose an email based on the context of your previous
            emails.
          </DialogDescription>
          <div className="h-2"></div>
          <Textarea
            placeholder="Enter a prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="h-2"></div>
          <Button
            onClick={() => {
              setOpen(false);
              setPrompt("");
              aiGenerate();
            }}
          >
            Generate
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default AiComposeButton;
