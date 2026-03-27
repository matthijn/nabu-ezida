"use client"

import { WelcomeBackLoading as WelcomeBackLoadingComponent } from "~/ui/components/WelcomeBackLoading"

function WelcomeBackLoading() {
  return <WelcomeBackLoadingComponent progress={65} statusLabel="Setting up your workspace" />
}

export default WelcomeBackLoading
