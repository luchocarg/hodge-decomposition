module DiscreteMath.DecomposeGraph 
    ( decomposeGraph
    , DecompositionResult
    ) where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import qualified Data.Sequence as Seq
import Data.Sequence (ViewL(..), (|>), viewl)
import Data.List (foldl')
import Domain.Types

type DecompositionResult = ([InternalEdge], [InternalEdge])

decomposeGraph :: ComputationalGraph -> DecompositionResult
decomposeGraph (ComputationalGraph adjMap)
    | Map.null adjMap = ([], [])
    | otherwise = 
        let 
            root = fst $ Map.findMin adjMap
            symmetricAdj = buildSymmetricAdjacency adjMap
            
            initialState = BFSState 
                { queue = Seq.singleton root
                , visitedNodes = Set.singleton root
                , processedEdgeIds = Set.empty
                , treeAcc = []
                , cycleAcc = [] 
                }
        in 
            runBFS symmetricAdj initialState

buildSymmetricAdjacency :: Map.Map NodeIdentifier [InternalEdge] -> Map.Map NodeIdentifier [(NodeIdentifier, InternalEdge)]
buildSymmetricAdjacency directedMap = 
    Map.foldlWithKey' addEdges Map.empty directedMap
  where
    addEdges acc srcNode edges = foldl' (addSingleEdge srcNode) acc edges
    
    addSingleEdge src acc edge = 
        let dst = destinationNode edge

            acc1 = Map.insertWith (++) src [(dst, edge)] acc

            acc2 = Map.insertWith (++) dst [(src, edge)] acc1
        in acc2

data BFSState = BFSState {
    queue            :: Seq.Seq NodeIdentifier,
    visitedNodes     :: Set.Set NodeIdentifier,
    processedEdgeIds :: Set.Set EdgeIdentifier,
    treeAcc          :: [InternalEdge],
    cycleAcc         :: [InternalEdge]
}

runBFS :: Map.Map NodeIdentifier [(NodeIdentifier, InternalEdge)] -> BFSState -> DecompositionResult
runBFS adj state =
    case viewl (queue state) of
        EmptyL -> (treeAcc state, cycleAcc state)
        
        u :< restQueue -> 
            let 
                neighbors = Map.findWithDefault [] u adj
                newState = foldl' processNeighbor (state { queue = restQueue }) neighbors
            in 
                runBFS adj newState

processNeighbor :: BFSState -> (NodeIdentifier, InternalEdge) -> BFSState
processNeighbor state (neighborNode, edge) =
    let 
        edgeId = edgeIdentifier edge
    in
        if Set.member edgeId (processedEdgeIds state)
        then state
        else 
            let 
                isNeighborVisited = Set.member neighborNode (visitedNodes state)
                newProcessed = Set.insert edgeId (processedEdgeIds state)
            in 
                if isNeighborVisited
                then 
                    state { 
                        processedEdgeIds = newProcessed,
                        cycleAcc = edge : cycleAcc state 
                    }
                else 
                    state { 
                        processedEdgeIds = newProcessed,
                        visitedNodes = Set.insert neighborNode (visitedNodes state),
                        queue = (queue state) |> neighborNode,
                        treeAcc = edge : treeAcc state
                    }