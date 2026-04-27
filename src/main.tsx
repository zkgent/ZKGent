import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { ApplicationProvider } from "./context/ApplicationContext";
import { WalletProvider } from "./context/WalletContext";
import "./styles.css";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApplicationProvider>
      <WalletProvider>
        <RouterProvider router={router} />
      </WalletProvider>
    </ApplicationProvider>
  </StrictMode>
);
