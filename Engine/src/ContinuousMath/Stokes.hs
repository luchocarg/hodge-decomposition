{-# LANGUAGE StrictData #-}

module ContinuousMath.Stokes (
    calculateRotationalFlow
) where

import qualified Data.Map.Strict as Map
import qualified Domain.Types as Dom
import qualified DiscreteMath.TreePath as Path
import Data.List (foldl')

calculateRotationalFlow :: [Dom.InternalEdge] -- Tree Edges
                        -> [Dom.InternalEdge] -- Cotree Edges
                        -> Map.Map Dom.EdgeIdentifier Dom.FlowAmount
calculateRotationalFlow treeEdges = 
    foldl' (projectCycle treeEdges) Map.empty

projectCycle :: [Dom.InternalEdge] 
             -> Map.Map Dom.EdgeIdentifier Dom.FlowAmount 
             -> Dom.InternalEdge 
             -> Map.Map Dom.EdgeIdentifier Dom.FlowAmount
projectCycle treeEdges accMap chordEdge =
    let 
        u = Dom.sourceNode chordEdge
        v = Dom.destinationNode chordEdge
        flow = Dom.currentFlow chordEdge
        eid = Dom.edgeIdentifier chordEdge
        
        -- Chord carries its own rotational flow
        accWithChord = Map.insertWith (+) eid flow accMap
        
        -- Find return path v->u in tree to close the loop
    in
        case Path.findPathInTree treeEdges v u of
            Nothing -> accWithChord
            Just path -> 
                applyFlowToPath v flow path accWithChord

applyFlowToPath :: Dom.NodeIdentifier   -- Curr node in traversal
                -> Dom.FlowAmount       -- Flow
                -> [Dom.InternalEdge]   -- Remaining path
                -> Map.Map Dom.EdgeIdentifier Dom.FlowAmount 
                -> Map.Map Dom.EdgeIdentifier Dom.FlowAmount
applyFlowToPath _ _ [] acc = acc
applyFlowToPath currNode flow (edge:rest) acc =
    let 
        eid = Dom.edgeIdentifier edge
        u = Dom.sourceNode edge
        v = Dom.destinationNode edge
        
        (isAligned, nextNode) = if u == currNode 
                                then (True, v)
                                else (False, u)
        
        signedFlow = if isAligned then flow else -flow
        newAcc = Map.insertWith (+) eid signedFlow acc
    in 
        applyFlowToPath nextNode flow rest newAcc