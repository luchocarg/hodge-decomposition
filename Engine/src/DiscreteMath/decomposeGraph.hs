module DiscreteMath (decomposeGraph) where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import qualified Data.Sequence as Seq
import Data.Sequence (ViewL(..), (|>), viewl)
import Data.List (foldl')
import Domain.Types

decomposeGraph :: ComputationalGraph -> (Set.Set EdgeIdentifier, Set.Set EdgeIdentifier)
decomposeGraph graph@(ComputationalGraph adjMap)
    | Map.null adjMap = (Set.empty, Set.empty)
    | otherwise = (treeEdges, cycleEdges)
  where
    root = fst $ Map.findMin adjMap
    initialQueue = Seq.singleton root
    initialVisited = Set.singleton root

    treeEdges = bfs initialQueue initialVisited Set.empty

    allEdges = getAllEdgeIds graph
    cycleEdges = Set.difference allEdges treeEdges

    getAllEdgeIds (ComputationalGraph m) = Set.fromList [ edgeIdentifier e | edges <- Map.elems m, e <- edges ]


    bfs :: Seq.Seq NodeIdentifier -> Set.Set NodeIdentifier -> Set.Set EdgeIdentifier -> Set.Set EdgeIdentifier
    bfs queue visited accTreeEdges =
        case viewl queue of
            EmptyL -> accTreeEdges
            
            u :< restQueue -> 
                let 
                    neighbors = Map.findWithDefault [] u adjMap
                    
                    (newQueue, newVisited, newTreeEdges) = 
                        foldl' expandFrontier (restQueue, visited, accTreeEdges) neighbors
                in 
                    bfs newQueue newVisited newTreeEdges

    expandFrontier (q, v, edges) edge =
        let dest = destinationNode edge
        in if Set.member dest v
           then (q, v, edges) -- already visited
           else (q |> dest, Set.insert dest v, Set.insert (edgeIdentifier edge) edges) -- new node