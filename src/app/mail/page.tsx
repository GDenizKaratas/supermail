"use client";
import React from "react";
// import Mail from "./mail";
import dynamic from "next/dynamic";
import ThemeToggle from "@/components/theme-toggle";

const Mail = dynamic(() => import("./mail"), { ssr: false });

const MailPage = () => {
  return (
    <>
      <div className="absolute bottom-20 left-4">
        <ThemeToggle />
      </div>
      <Mail
        deafultLayout={[20, 32, 48]}
        defaultCollapsed={false}
        navCollapsedSize={4}
      />
    </>
  );
};

export default MailPage;
