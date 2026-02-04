{-# LANGUAGE ForeignFunctionInterface #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Foreign.C.String (CString, newCString, peekCString)
import Foreign.Ptr (Ptr)
import qualified Data.ByteString.Lazy.Char8 as BS
import Data.Aeson (decode, encode)

import qualified Infrastructure.JsonDto as Dto
import qualified Infrastructure.Mappers as Mapper
import qualified Domain.Types as Dom
import qualified ContinuousMath.Decomposition as Logic

foreign export ccall "run_decomposition" run_decomposition :: CString -> IO CString

run_decomposition :: CString -> IO CString
run_decomposition inputPtr = do
    jsonStr <- peekCString inputPtr
    let inputData = BS.pack jsonStr
    
    let outputData = case decode inputData :: Maybe Dto.IncomingGraphDto of
            Nothing -> 
                encode $ Dto.IncomingGraphDto [] []
            
            Just incomingDto -> 
                let domainGraph = Mapper.toComputationalGraph incomingDto
                    simulationResult = Logic.decompose domainGraph
                    outgoingDto = Mapper.toOutgoingDto simulationResult
                in encode outgoingDto

    newCString (BS.unpack outputData)

main :: IO ()
main = return ()
