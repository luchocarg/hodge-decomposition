{-# LANGUAGE OverloadedStrings #-}

module Main where

import qualified Data.ByteString.Lazy as ByteString
import Data.Aeson (decode, encode)
import System.IO (hPutStrLn, stderr)

import qualified Infrastructure.JsonDto as Dto
import qualified Infrastructure.Mappers as Mapper

import qualified Domain.Types as Dom
import qualified ContinuousMath.Decomposition as Logic

main :: IO ()
main = do
    inputData <- ByteString.getContents
    
    case decode inputData :: Maybe Dto.IncomingGraphDto of
        Nothing -> 
            hPutStrLn stderr "Error: Invalid JSON Format. Could not parse input graph."
            
        Just incomingDto -> do
            let domainGraph = Mapper.toComputationalGraph incomingDto

            let simulationResult = Logic.decompose domainGraph
            
            let outgoingDto = Mapper.toOutgoingDto simulationResult
            
            ByteString.putStr (encode outgoingDto)