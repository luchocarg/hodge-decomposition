{-# LANGUAGE OverloadedStrings #-}

module Main where

import qualified Data.ByteString.Lazy as ByteString
import Data.Aeson (decode, encode)
import qualified Infrastructure.JsonDto as Dto
import qualified Infrastructure.Mappers as Mapper
import qualified Domain.Types as Dom
-- import qualified ContinuousMath.Decomposition as Logic

main :: IO ()
main = do
    inputData <- ByteString.getContents
    
    case decode inputData :: Maybe Dto.IncomingGraphDto of
        Nothing -> putStrLn "Error: Invalid JSON Format"
        Just incomingDto -> do
            let domainGraph = Mapper.toComputationalGraph incomingDto

            let dummyResult = Dom.SimulationResult [] [] True -- Dummy temporal
            
            let outgoingDto = Mapper.toOutgoingDto dummyResult
            
            ByteString.putStr (encode outgoingDto)