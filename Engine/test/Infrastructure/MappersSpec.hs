module Infrastructure.MappersSpec (tests) where

import Test.QuickCheck
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import Data.List (sort)

import Domain.Types
import Infrastructure.JsonDto
import Infrastructure.Mappers (toComputationalGraph)
import Common.Generators (genConnectedGraph)

-- Props
prop_mapperRoundtrip :: ComputationalGraph -> Property
prop_mapperRoundtrip originalGraph =
    let 
        dto = mockIncomingDto originalGraph
        
        mappedGraph = toComputationalGraph dto
    in
        counterexample "Data Corruption: Roundtrip serialization altered the graph structure" $
            areGraphsEquivalent originalGraph mappedGraph

prop_sourceNodeIntegrity :: ComputationalGraph -> Property
prop_sourceNodeIntegrity g =
    let 
        dto = mockIncomingDto g
        (ComputationalGraph m) = toComputationalGraph dto
        
        checkNode (u, edges) = all (\e -> sourceNode e == u) edges
        
        validNodes = filter checkNode (Map.toList m)
    in
        counterexample "Schema Violation: Edge 'sourceNode' contradicts adjacency map key" $
            length validNodes == Map.size m

-- Helpers

areGraphsEquivalent :: ComputationalGraph -> ComputationalGraph -> Bool
areGraphsEquivalent (ComputationalGraph m1) (ComputationalGraph m2) =
    let 
        nodes1 = Map.keysSet m1
        nodes2 = Map.keysSet m2
        
        sortEdges = sort . map edgeIdentifier
        
        edgesMatch = all (\n -> 
            let e1 = Map.findWithDefault [] n m1
                e2 = Map.findWithDefault [] n m2
            in sortEdges e1 == sortEdges e2
            ) (Set.toList nodes1)
            
    in nodes1 == nodes2 && edgesMatch


mockIncomingDto :: ComputationalGraph -> IncomingGraphDto
mockIncomingDto (ComputationalGraph m) =
    IncomingGraphDto {
        incomingGraphNodes = map (\(NodeIdentifier i) -> i) (Map.keys m),
        incomingGraphEdges = concatMap toDtoEdges (Map.toList m)
    }
  where
    toDtoEdges (u, edges) = map (toDtoEdge u) edges
    
    toDtoEdge (NodeIdentifier uId) edge = IncomingEdgeDto {
        incomingEdgeId = let (EdgeIdentifier i) = edgeIdentifier edge in i,
        incomingEdgeFrom = uId,
        incomingEdgeTo = let (NodeIdentifier i) = destinationNode edge in i,
        incomingEdgeFlow = currentFlow edge
    }

tests :: IO ()
tests = do
    putStrLn "\n[Infrastructure.Mappers] Verifying Boundary..."
    
    putStrLn "  1. Roundtrip Integrity (Domain -> DTO -> Domain)"
    quickCheck $ forAll genConnectedGraph prop_mapperRoundtrip
    
    putStrLn "  2. SourceNode Consistency"
    quickCheck $ forAll genConnectedGraph prop_sourceNodeIntegrity