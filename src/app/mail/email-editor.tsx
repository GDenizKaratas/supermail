"use client";

import React, { use } from "react";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Text } from "@tiptap/extension-text";
import EditorMenubar from "./editor-menubar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import TagInput from "./tag-input";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
type Props = {
  subject: string;
  setSubject: (value: string) => void;

  toValues: { label: string; value: string }[];
  setToValues: (values: { label: string; value: string }[]) => void;

  ccValues: { label: string; value: string }[];
  setCcValues: (values: { label: string; value: string }[]) => void;

  to: string[];

  handleSend: (value: string) => Promise<void>;
  isSending: boolean;
  defaultToolbarExpanded?: boolean;
};

const EmailEditor = ({
  toValues,
  setToValues,
  ccValues,
  setCcValues,
  subject,
  setSubject,
  to,
  handleSend,
  isSending,
  defaultToolbarExpanded,
}: Props) => {
  const [value, setValue] = React.useState("");
  const [expanded, setExpanded] = React.useState(defaultToolbarExpanded);

  // const { data: suggestions } = api..getEmailSuggestions.useQuery(
  //   { accountId: accountId, query: "" },
  //   { enabled: !!accountId },
  // );
  const suggestions: any = [];
  const customText = Text.extend({
    addKeyboardShortcuts() {
      return {
        "Meta-j": () => {
          console.log("META-J");
          return true;
        },
      };
    },
  });
  const editor = useEditor({
    autofocus: false,
    extensions: [StarterKit, customText],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        placeholder: "Write your email here...",
      },
    },
    onUpdate: ({ editor, transaction }) => {
      setValue(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div>
      <div className="flex border-b p-4 py-2">
        <EditorMenubar editor={editor} />
      </div>
      <div className="space-y-2 p-4 pb-0">
        {expanded && (
          <>
            <TagInput
              value={toValues}
              placeholder="Add tags"
              label="To"
              onChange={setToValues}
            />
            <TagInput
              value={ccValues}
              placeholder="Add tags"
              label="Cc"
              onChange={setCcValues}
            />
            <Input
              id="subject"
              className="w-full"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </>
        )}

        <div className="flex items-center gap-2"></div>
        <div className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <span className="font-medium text-green-600">Draft </span>
          <span>to {to.join(", ")}</span>
        </div>
      </div>
      <div className="prose w-full px-4">
        <EditorContent
          value={value}
          editor={editor}
          placeholder="Write your email here..."
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm">
          Tip: Press{" "}
          <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-800">
            Cmd + J
          </kbd>{" "}
          for AI autocomplete
        </span>
        <Button
          onClick={async () => {
            editor?.commands.clearContent();
            await handleSend(value);
          }}
          disabled={isSending}
          // isLoading={isSending}
        >
          <Send className="size-4" />
          Gönder
        </Button>
      </div>
    </div>
  );
};

export default EmailEditor;
