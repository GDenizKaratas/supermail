"use client";
import React from "react";
// import Mail from "./mail";
import dynamic from "next/dynamic";

const Mail = dynamic(() => import("./mail"), { ssr: false });

const MailPage = () => {
  return (
    <Mail
      deafultLayout={[20, 32, 48]}
      defaultCollapsed={false}
      navCollapsedSize={4}
    />
  );
};

export default MailPage;
