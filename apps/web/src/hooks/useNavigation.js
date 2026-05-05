import { useState, useCallback } from "react";

export function useNavigation() {
  const [activeTab, setActiveTab] = useState("home");

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return { activeTab, navigate };
}
