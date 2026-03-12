'use client';

import DeleteProductionButton from '../../../components/DeleteProductionButton';

interface Props {
  productionId: string;
  productionName: string;
  token: string;
  isDeleted: boolean;
}

export function DangerZone({ productionId, productionName, token, isDeleted }: Props) {
  return (
    <div className="mt-8 bg-gray-900 border border-red-900/40 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
      <p className="text-xs text-gray-500 mb-4">These actions are destructive and cannot be undone.</p>
      <div className="flex flex-col gap-3">
        {!isDeleted && (
          <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-800">
            <div>
              <p className="text-sm font-medium text-white">Archive Production</p>
              <p className="text-xs text-gray-500 mt-0.5">Hides the production from your list. Can still be permanently deleted.</p>
            </div>
            <DeleteProductionButton
              productionId={productionId}
              productionName={productionName}
              token={token}
              mode="soft"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Permanently Delete</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Deletes all scripts, scenes, sets, assets, schedules, and all other production data forever.
            </p>
          </div>
          <DeleteProductionButton
            productionId={productionId}
            productionName={productionName}
            token={token}
            mode="hard"
          />
        </div>
      </div>
    </div>
  );
}
