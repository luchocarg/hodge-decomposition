{-# LANGUAGE OverloadedStrings #-}

module Main where

import qualified Data.ByteString.Lazy as ByteString
import qualified Data.ByteString.Lazy.Char8 as Char8
import Data.Aeson (decode, encode)
import System.IO (hPutStrLn, stderr)

import qualified Infrastructure.JsonDto as Dto
import qualified Infrastructure.Mappers as Mapper
import qualified Infrastructure.TextParser as TextParser

import qualified Domain.Types as Dom
import qualified ContinuousMath.Decomposition as Logic

main :: IO ()
main = do
    inputData <- ByteString.getContents
    
    case decode inputData :: Maybe Dto.IncomingGraphDto of
        
        Just incomingDto -> do
            let domainGraph = Mapper.toComputationalGraph incomingDto
            runSimulation domainGraph

        Nothing -> do
            let inputString = Char8.unpack inputData

            case TextParser.parseGraphText inputString of
                
                Right edgeTuples -> do
                    let domainGraph = Mapper.fromTupleToGraph edgeTuples
                    runSimulation domainGraph

                Left parseError -> do
                    hPutStrLn stderr "Error: Could not parse input."
                    hPutStrLn stderr "Hint: Input must be either valid JSON or follow format '1 -> 2 : 20'"
                    hPutStrLn stderr $ "Parser details: " ++ show parseError

runSimulation :: Dom.ComputationalGraph -> IO ()
runSimulation graph = do
    let simulationResult = Logic.decompose graph
    
    let outgoingDto = Mapper.toOutgoingDto simulationResult
    
    ByteString.putStr (encode outgoingDto)