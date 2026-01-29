{-# LANGUAGE StrictData #-}

module ContinuousMath.Decomposition (
    decompose
) where

import qualified Data.Map.Strict as Map
import qualified Domain.Types as Dom
import qualified DiscreteMath.DecomposeGraph as Topo
import qualified ContinuousMath.Gauss as Gauss
import qualified ContinuousMath.Stokes as Stokes
import qualified ContinuousMath.Potential as Potential

decompose :: Dom.ComputationalGraph -> Dom.SimulationResult
decompose graph@(Dom.ComputationalGraph adjMap) = 
    let 
        divMap = Gauss.calculateDivergences graph
        
        potentialMap = Potential.solvePotentials graph divMap

        allEdges = concat (Map.elems adjMap)

        rotationalMap = Stokes.calculateRotationalFlow allEdges potentialMap
        
        calcEdgeResult :: Dom.InternalEdge -> Dom.CalculatedEdgeResult
        calcEdgeResult edge = 
            let 
                eid = Dom.edgeIdentifier edge
                u = Dom.sourceNode edge
                v = Dom.destinationNode edge
                
                phi_u = Map.findWithDefault 0.0 u potentialMap
                phi_v = Map.findWithDefault 0.0 v potentialMap
                
                gradF = phi_u - phi_v
                rotF  = Map.findWithDefault 0.0 eid rotationalMap
            in 
                Dom.CalculatedEdgeResult 
                    { Dom.resultEdgeIdentifier = eid
                    , Dom.resultSource = u
                    , Dom.resultTarget = v
                    , Dom.gradientComponent = gradF
                    , Dom.rotationalComponent = rotF
                    }

        edgeResults = map calcEdgeResult allEdges
        
        calcNodeResult :: Dom.NodeIdentifier -> Dom.CalculatedNodeResult
        calcNodeResult nid = 
            Dom.CalculatedNodeResult 
                { Dom.resultNodeIdentifier = nid
                , Dom.divergenceValue = Map.findWithDefault 0.0 nid divMap
                , Dom.potentialValue = Map.findWithDefault 0.0 nid potentialMap
                }

        nodeResults = map calcNodeResult (Map.keys adjMap)

        totalDiv = sum (Map.elems divMap)
        isConservative = abs totalDiv < 1e-6

    in 
        Dom.SimulationResult nodeResults edgeResults isConservative