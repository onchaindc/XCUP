type ConnectorLike = {
  id: string;
  name: string;
  type?: string;
};

function isMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function pickWalletConnector<T extends ConnectorLike>(connectors: readonly T[]) {
  const privy = connectors.find((connector) => connector.id.toLowerCase().includes("privy") || connector.name.toLowerCase().includes("privy"));
  const walletConnect = connectors.find((connector) => connector.id === "walletConnect" || connector.name.toLowerCase().includes("walletconnect"));
  const injected = connectors.find((connector) => connector.id === "injected" || connector.type === "injected");

  if (isMobileBrowser() && privy) {
    return privy;
  }

  if (isMobileBrowser() && walletConnect) {
    return walletConnect;
  }

  return injected ?? walletConnect ?? connectors[0];
}
