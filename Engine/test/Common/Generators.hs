module Common.Generators 
    ( genConnectedGraph
    , genGraphWithConfig
    , GraphGenConfig(..)
    , defaultGenConfig
    ) where

import Test.QuickCheck
import qualified Data.Map.Strict as Map
import Domain.Types
import qualified Data.Set as Set

-- Config

data GraphGenConfig = GraphGenConfig {
    minNodes :: Int,
    maxNodes :: Int,
    density  :: Double, -- 0.0 a 1.0
    flowRange :: (Double, Double)
} deriving (Show, Eq)

defaultGenConfig :: GraphGenConfig
defaultGenConfig = GraphGenConfig {
    minNodes = 2,
    maxNodes = 20,
    density  = 0.3,
    flowRange = (-100.0, 100.0)
}

type RawEdge = (NodeIdentifier, NodeIdentifier)

-- Public API

instance Arbitrary ComputationalGraph where
    arbitrary = genGraphWithConfig defaultGenConfig

genConnectedGraph :: Gen ComputationalGraph
genConnectedGraph = arbitrary

-- Pipeline

genGraphWithConfig :: GraphGenConfig -> Gen ComputationalGraph
genGraphWithConfig config = do
    nodes <- genNodeUniverse (minNodes config) (maxNodes config)

    skeleton <- genLinearSpanningTree nodes

    noise <- genCycleEdges nodes (density config) skeleton
    
    let topology = skeleton ++ noise
    
    weightedEdges <- generateDomainEdges (flowRange config) topology

    return $ buildGraph nodes weightedEdges

-- Primitives

genNodeUniverse :: Int -> Int -> Gen [NodeIdentifier]
genNodeUniverse minN maxN = do
    count <- choose (minN, maxN)
    return $ map NodeIdentifier [1 .. count]

genLinearSpanningTree :: [NodeIdentifier] -> Gen [RawEdge]
genLinearSpanningTree nodes = do
    shuffled <- shuffle nodes
    return $ zip shuffled (drop 1 shuffled)

genCycleEdges :: [NodeIdentifier] -> Double -> [RawEdge] -> Gen [RawEdge]
genCycleEdges nodes dens existingEdges = do
    let maxPossibleEdges = length nodes * (length nodes - 1)
    let noiseCount = floor $ fromIntegral maxPossibleEdges * dens
    
    let existingSet = Set.fromList existingEdges
    
    candidates <- vectorOf (noiseCount * 2) $ do
        u <- elements nodes
        v <- elements nodes
        return (u, v)
        
    let validNoise = filter (\(u,v) -> u /= v && not (Set.member (u,v) existingSet)) candidates
    
    return $ take noiseCount validNoise

generateDomainEdges :: (Double, Double) -> [RawEdge] -> Gen [(NodeIdentifier, InternalEdge)]
generateDomainEdges range rawEdges = 
    mapM toDomainPair (zip [1..] rawEdges)
  where
    toDomainPair (idx, (u, v)) = do
        f <- choose range
        let edge = InternalEdge {
            edgeIdentifier = EdgeIdentifier idx,
            sourceNode = u,
            destinationNode = v,
            currentFlow = f
        }
        return (u, edge)

-- Build

buildGraph :: [NodeIdentifier] -> [(NodeIdentifier, InternalEdge)] -> ComputationalGraph
buildGraph nodes edgeList = ComputationalGraph $
    Map.unionWith (++) edgesMap emptyNodesMap
  where
    emptyNodesMap = Map.fromList [ (n, []) | n <- nodes ]
    edgesMap = Map.fromListWith (++) [ (u, [e]) | (u, e) <- edgeList ]