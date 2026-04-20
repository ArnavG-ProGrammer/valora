export interface Market {
  id: string;
  label: string;
  country: string;
  flag: string;
  suffix: string;
  yahooExchanges: string[];
}

export const MARKETS: Market[] = [
  { id: "NSE",      label: "NSE",      country: "India",          flag: "\u{1F1EE}\u{1F1F3}", suffix: ".NS", yahooExchanges: ["NSI"] },
  { id: "BSE",      label: "BSE",      country: "India",          flag: "\u{1F1EE}\u{1F1F3}", suffix: ".BO", yahooExchanges: ["BSE"] },
  { id: "NYSE",     label: "NYSE",     country: "United States",  flag: "\u{1F1FA}\u{1F1F8}", suffix: "",    yahooExchanges: ["NYQ", "NYS"] },
  { id: "NASDAQ",   label: "NASDAQ",   country: "United States",  flag: "\u{1F1FA}\u{1F1F8}", suffix: "",    yahooExchanges: ["NMS", "NGM", "NCM", "NAS"] },
  { id: "LSE",      label: "LSE",      country: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", suffix: ".L",  yahooExchanges: ["LSE"] },
  { id: "TSE",      label: "TSE",      country: "Japan",          flag: "\u{1F1EF}\u{1F1F5}", suffix: ".T",  yahooExchanges: ["JPX", "TKS"] },
  { id: "HKEX",     label: "HKEX",     country: "Hong Kong",      flag: "\u{1F1ED}\u{1F1F0}", suffix: ".HK", yahooExchanges: ["HKG"] },
  { id: "SSE",      label: "SSE",      country: "China",          flag: "\u{1F1E8}\u{1F1F3}", suffix: ".SS", yahooExchanges: ["SHH", "SHZ"] },
  { id: "EURONEXT", label: "Euronext", country: "Europe",         flag: "\u{1F1EA}\u{1F1FA}", suffix: ".PA", yahooExchanges: ["PAR", "AMS", "BRU", "LIS"] },
  { id: "XETRA",    label: "XETRA",    country: "Germany",        flag: "\u{1F1E9}\u{1F1EA}", suffix: ".DE", yahooExchanges: ["GER", "FRA"] },
  { id: "TSX",      label: "TSX",      country: "Canada",         flag: "\u{1F1E8}\u{1F1E6}", suffix: ".TO", yahooExchanges: ["TOR", "VAN"] },
  { id: "ASX",      label: "ASX",      country: "Australia",      flag: "\u{1F1E6}\u{1F1FA}", suffix: ".AX", yahooExchanges: ["ASX"] },
];

export const DEFAULT_MARKET_ID = "NSE";

export function getMarketById(id: string): Market {
  return MARKETS.find((m) => m.id === id) || MARKETS[0];
}
