module ContinuousMath.PotentialSpec where --(tests) where

import Test.QuickCheck
import qualified Data.Map.Strict as Map
import Data.List (find)
import Domain.Types
import Common.Generators (genConnectedGraph)
import ContinuousMath.Decomposition (decompose)
-- import ContinuousMath.Potential (solvePotentials)
