import React, { createContext, useContext, useState, ReactNode } from "react";

//Fridge data type
interface Fridge {
  id: string | null;
  name: string | null;
}

//Context type
interface FridgeContextType {
  fridge: Fridge;
  setFridge: (f: Fridge) => void;
}

//Create the context
const FridgeContext = createContext<FridgeContextType | undefined>(undefined);

//Wraps parts of the app that need fridge info
export const FridgeProvider = ({ children }: { children: ReactNode }) => {
  //Fridge state
  const [fridge, setFridge] = useState<Fridge>({ id: null, name: null });

  return (
    //Share fridge and setFridge with everything inside
    <FridgeContext.Provider value={{ fridge, setFridge }}>
      {children}
    </FridgeContext.Provider>
  );
};

//Hook to use the fridge context
export const useFridge = () => {
  const context = useContext(FridgeContext);
  if (!context) {
    throw new Error("useFridge must be used within a FridgeProvider");
  }

  return context;
};
