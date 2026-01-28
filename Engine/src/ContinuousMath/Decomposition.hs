{-# LANGUAGE StrictData #-}

module ContinuousMath.Decomposition (
    decompose
) where

import qualified Data.Map.Strict as Map
import qualified Domain.Types as Dom
import qualified DiscreteMath.DecomposeGraph as Topo
import qualified ContinuousMath.Gauss as Gauss
import qualified ContinuousMath.Stokes as Stokes

-- Helmholtz-Hodge decomposition.
decompose :: Dom.ComputationalGraph -> Dom.SimulationResult
decompose graph@(Dom.ComputationalGraph adjMap) = 
    let 
        (treeEdges, cotreeEdges) = Topo.decomposeGraph graph
        
        rotationalMap = Stokes.calculateRotationalFlow treeEdges cotreeEdges
        
        -- Superposition Theorem
        allEdges = concat (Map.elems adjMap)
        
        calcEdgeResult :: Dom.InternalEdge -> Dom.CalculatedEdgeResult
        calcEdgeResult edge = 
            let 
                eid = Dom.edgeIdentifier edge
                totalF = Dom.currentFlow edge
                
                rotF = Map.findWithDefault 0.0 eid rotationalMap
                
                gradF = totalF - rotF
            in 
                Dom.CalculatedEdgeResult eid gradF rotF

        edgeResults = map calcEdgeResult allEdges

        divMap = Gauss.calculateDivergences graph
        
        calcNodeResult :: Dom.NodeIdentifier -> Dom.CalculatedNodeResult
        calcNodeResult nid = 
            Dom.CalculatedNodeResult 
                { Dom.resultNodeIdentifier = nid
                , Dom.divergenceValue = Map.findWithDefault 0.0 nid divMap
                , Dom.potentialValue = 0.0 -- TODO: Integrate gradient for visual potential
                }

        nodeResults = map calcNodeResult (Map.keys adjMap)

        totalDiv = sum (Map.elems divMap)
        isConservative = abs totalDiv < 1e-9

    in 
        Dom.SimulationResult nodeResults edgeResults isConservative