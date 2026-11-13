"use client";

import dynamic from "next/dynamic";
import {useCoinGate} from "@/app/hooks/useCoinGate";
import {lookupServerCoinPrice} from "@/app/_lib/serviceCoinPrice";
import {formatKrwFromCoins} from "@/lib/payment/coin-pricing";
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";

const StonehengeRune = dynamic(() => import("../../../StonehengeRune"));

export default function RuneRouteClient() {
  const {ensurePaidAccess,isPaying}=useCoinGate();
  return <StonehengeRune ensurePaidAccess={ensurePaidAccess} isPaying={isPaying}
    priceLabel={(key:string)=>formatKrwFromCoins(lookupServerCoinPrice(key))}
    renderDisclosure={(key:string)=><CraftedProductDisclosure featureKey={key}/>}/>;
}
