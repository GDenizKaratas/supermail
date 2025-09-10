"use client";
import React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountSwitcher from "./account-switcher";
import Sidebar from "./sidebar";
import ThreadList from "./thread-list";
import ThreadDisplay from "./thread-display";
import { useLocalStorage } from "usehooks-ts";

type Props = {
  deafultLayout: number[] | undefined;
  navCollapsedSize: number;
  defaultCollapsed: boolean;
};

const Mail = ({
  deafultLayout = [20, 32, 48],
  navCollapsedSize,
  defaultCollapsed,
}: Props) => {
  const [_, setDone] = useLocalStorage("supermail-done", false);

  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes) => console.log(sizes)}
        className="h-full min-h-screen items-stretch"
      >
        <ResizablePanel
          defaultSize={deafultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={40}
          onCollapse={() => {
            setIsCollapsed(true);
          }}
          onResize={() => {
            setIsCollapsed(false);
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out",
          )}
        >
          <div className="flex h-full flex-1 flex-col">
            <div
              className={cn(
                "flex h-[52px] items-center justify-between",
                isCollapsed ? "h-[52px]" : "px-2",
              )}
            >
              {/* Account Switcher */}
              <AccountSwitcher isCollapsed={isCollapsed} />
            </div>
            <Separator />
            {/* Sidebar */}
            <Sidebar isCollapsed={isCollapsed} />
            <div className="flex-1"></div>
            {/* AI  */}
            Ask AI
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          // className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-300"
        />
        <ResizablePanel defaultSize={deafultLayout[1]} minSize={30}>
          <Tabs defaultValue="inbox">
            <div className="flex items-center px-4 py-1">
              <h1 className="text-xl font-bold">Inbox</h1>
              <TabsList className="ml-auto">
                <TabsTrigger
                  onClick={() => setDone(false)}
                  value="inbox"
                  className="text-xinc-600 dark:text-xinc-200"
                >
                  Inbox
                </TabsTrigger>
                <TabsTrigger
                  onClick={() => setDone(true)}
                  value="done"
                  className="text-xinc-600 dark:text-xinc-200"
                >
                  Done
                </TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            {/* Searchbar */}
            Searchbar
            <TabsContent value="inbox">
              <ThreadList></ThreadList>
            </TabsContent>
            <TabsContent value="done">
              <ThreadList></ThreadList>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={deafultLayout[2]}
          minSize={30}
          maxSize={70}
          className="flex-1"
        >
          <ThreadDisplay />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
};

export default Mail;
