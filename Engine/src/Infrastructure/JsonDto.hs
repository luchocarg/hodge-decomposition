{-# LANGUAGE DeriveGeneric #-}

module Infrastructure.JsonDto where

import GHC.Generics
import Data.Aeson
import Data.Char (toLower)

cleanPrefixOptions :: String -> Options
cleanPrefixOptions prefix = defaultOptions { 
    fieldLabelModifier = \fieldName -> 
        case drop (length prefix) fieldName of
            (c:cs) -> toLower c : cs
            []     -> []
}

-- INPUT DTOs

data IncomingEdgeDto = IncomingEdgeDto {
    incomingEdgeId :: Int,
    incomingEdgeFrom :: Int,
    incomingEdgeTo :: Int,
    incomingEdgeFlow :: Double
} deriving (Show, Generic)

instance FromJSON IncomingEdgeDto where
    parseJSON = genericParseJSON (cleanPrefixOptions "incomingEdge")

instance ToJSON IncomingEdgeDto where
    toJSON = genericToJSON (cleanPrefixOptions "incomingEdge")

data IncomingGraphDto = IncomingGraphDto {
    incomingGraphNodes :: [Int],
    incomingGraphEdges :: [IncomingEdgeDto]
} deriving (Show, Generic)

instance FromJSON IncomingGraphDto where
    parseJSON = genericParseJSON (cleanPrefixOptions "incomingGraph")

instance ToJSON IncomingGraphDto where
    toJSON = genericToJSON (cleanPrefixOptions "incomingGraph")

-- OUTPUT DTOs

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