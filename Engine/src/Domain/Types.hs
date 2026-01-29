{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE StrictData #-}

module Domain.Types where

import Data.Map.Strict (Map)

-- Newtypes

newtype NodeIdentifier = NodeIdentifier Int 
    deriving stock (Show, Eq, Ord)
    deriving newtype (Num, Integral, Real, Enum)

newtype EdgeIdentifier = EdgeIdentifier Int 
    deriving stock (Show, Eq, Ord)
    deriving newtype (Num, Integral, Real, Enum)

type FlowAmount = Double
type PotentialValue = Double

-- Adjacency Map

data InternalEdge = InternalEdge {
    edgeIdentifier :: EdgeIdentifier,
    sourceNode :: NodeIdentifier,
    destinationNode :: NodeIdentifier,
    currentFlow :: FlowAmount
} deriving (Show, Eq)


newtype ComputationalGraph = ComputationalGraph (Map NodeIdentifier [InternalEdge])
    deriving (Show, Eq)

-- Calculus Results

data CalculatedEdgeResult = CalculatedEdgeResult {
    resultEdgeIdentifier :: EdgeIdentifier,
    resultSource :: NodeIdentifier,
    resultTarget :: NodeIdentifier,
    gradientComponent :: FlowAmount,
    rotationalComponent :: FlowAmount
} deriving (Show, Eq)

data CalculatedNodeResult = CalculatedNodeResult {
    resultNodeIdentifier :: NodeIdentifier,
    divergenceValue :: FlowAmount,
    potentialValue :: PotentialValue
} deriving (Show, Eq)

data SimulationResult = SimulationResult {
    nodeResults :: [CalculatedNodeResult],
    edgeResults :: [CalculatedEdgeResult],
    isSystemConservative :: Bool
} deriving (Show, Eq)