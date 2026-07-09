import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
const bossImg = new URL("../../Images/Bosses.png", import.meta.url).href;
const underbossImg = new URL("../../Images/UnderBosses.png", import.meta.url).href;
const minionImg = new URL("../../Images/Minions.png", import.meta.url).href;
import UnifiedCarouselComponent from "../views/Filters";
import UsersContainer from "../views/Users";
import CardsLayout from "../Layouts/Cards";
import { TabledViews } from "../Tabulator/TabledViews";
import FilterLayout from "../Layouts/Filters";
import { useNavigator } from "../../Hooks/useQueryMedia";
import { ADD_ROWS, VIEW_ROWS, REMOVE_ROWS } from "../../utils";
import Instructions from "../views/Instructions";

const RoutesComponent: React.FC = () => {
  useNavigator();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/settings" replace />} />
      <Route path="instructions/:encodedData" element={
        <CardsLayout>
          <Instructions />
        </CardsLayout>
      } />
      <Route path="minions/:encodedData" element={
        <CardsLayout>
          <UsersContainer avatarImage={minionImg} titleKey="minion" />
        </CardsLayout>
      } />
      <Route path="bosses/:encodedData" element={
        <CardsLayout>
          <UsersContainer avatarImage={bossImg} titleKey="boss" />
        </CardsLayout>
      } />
      <Route path="higherunderbosses/:encodedData" element={
        <CardsLayout prefix="higher">
          <UsersContainer avatarImage={underbossImg} titleKey="underboss" />
        </CardsLayout>
      } />
      <Route path="lowerunderbosses/:encodedData" element={
        <CardsLayout prefix="lower">
          <UsersContainer avatarImage={underbossImg} titleKey="underboss" />
        </CardsLayout>
      } />
      <Route path="underbosses/:encodedData" element={
        <CardsLayout>
          <UsersContainer avatarImage={underbossImg} titleKey="underboss" />
        </CardsLayout>
      } />
      <Route path="filters/:encodedData" element={
        <FilterLayout>
          <UnifiedCarouselComponent entityType="filter" parentType="filters" />
        </FilterLayout>
      } />
      <Route path="dashboards/:encodedData" element={
        <FilterLayout>
          <UnifiedCarouselComponent entityType="dashboard" parentType="dashboards" />
        </FilterLayout>
      } />
      <Route path="sifters/:encodedData" element={
        <FilterLayout>
          <UnifiedCarouselComponent entityType="sifter" parentType="sifters" />
        </FilterLayout>
      } />
      <Route path="lowersifters/:encodedData" element={
        <FilterLayout prefix="lower">
          <UnifiedCarouselComponent entityType="sifter" parentType="sifters" />
        </FilterLayout>
      } />
      <Route path="highersifters/:encodedData" element={
        <FilterLayout prefix="higher">
          <UnifiedCarouselComponent entityType="sifter" parentType="sifters" />
        </FilterLayout>
      } />
      <Route path="tabulator/:target/:encodedData" element={
        <TabledViews operation={VIEW_ROWS} />
      } />
      <Route path="remove/:target/:encodedData" element={
        <TabledViews operation={REMOVE_ROWS} />
      } />
      <Route path="add/:target/:encodedData" element={
        <TabledViews operation={ADD_ROWS} />
      } />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
};

export default RoutesComponent;
