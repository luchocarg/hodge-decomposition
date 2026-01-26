module Common.GeneratorSpec (tests) where

import Test.QuickCheck
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import Domain.Types
import Common.Generators (genConnectedGraph)