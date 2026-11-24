'use client';
import {createContext} from 'react';

export type SpacePlatform={
  ownerScope:string;
  savePhoto:(image:Blob,fileName:string)=>Promise<void>;
};
export const SpacePlatformContext=createContext<SpacePlatform|null>(null);
