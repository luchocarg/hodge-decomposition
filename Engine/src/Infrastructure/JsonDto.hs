{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DerivingStrategies #-}

module Infrastructure.JsonDto where

import GHC.Generics
import Data.Aeson
import Data.Char (toLower)

cleanPrefixOptions :: String -> Options
cleanPrefixOptions prefix = defaultOptions { 
    fieldLabelModifier = \fieldName -> 
        let dropped = drop (length prefix) fieldName
        in (toLower (head dropped) : tail dropped)
}

-- DTOs INPUT

data IncomingEdgeDto = IncomingEdgeDto {
    incomingEdgeId :: Int,
    incomingEdgeFrom :: Int,
    incomingEdgeTo :: Int,
    incomingEdgeFlow :: Double
} deriving (Show, Generic)

instance FromJSON IncomingEdgeDto where
    parseJSON = genericParseJSON (cleanPrefixOptions "incomingEdge")

data IncomingGraphDto = IncomingGraphDto {
    incomingGraphNodes :: [Int],
    incomingGraphEdges :: [IncomingEdgeDto]
} deriving (Show, Generic)

instance FromJSON IncomingGraphDto where
    parseJSON = genericParseJSON (cleanPrefixOptions "incomingGraph")

-- DTOs OUTPUT

data OutgoingEdgeResultDto = OutgoingEdgeResultDto {
    outgoingEdgeResultId :: Int,
    outgoingEdgeResultGradient :: Double,
    outgoingEdgeResultRotational :: Double
} deriving (Show, Generic)

instance ToJSON OutgoingEdgeResultDto where
    toJSON = genericToJSON (cleanPrefixOptions "outgoingEdgeResult")

data OutgoingNodeResultDto = OutgoingNodeResultDto {
    outgoingNodeResultId :: Int,
    outgoingNodeResultDivergence :: Double,
    outgoingNodeResultPotential :: Double
} deriving (Show, Generic)

instance ToJSON OutgoingNodeResultDto where
    toJSON = genericToJSON (cleanPrefixOptions "outgoingNodeResult")

data OutgoingSimulationResultDto = OutgoingSimulationResultDto {
    outgoingSimulationResultNodes :: [OutgoingNodeResultDto],
    outgoingSimulationResultEdges :: [OutgoingEdgeResultDto],
    outgoingSimulationResultIsConservative :: Bool
} deriving (Show, Generic)

instance ToJSON OutgoingSimulationResultDto where
    toJSON = genericToJSON (cleanPrefixOptions "outgoingSimulationResult")