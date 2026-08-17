// const typeSchema = z.object({
//   id: z.number(),
//   name: z.string(),
// });

//TODO: remove this since it's not used anywhere
// export const getTypes = async () => {
//   const data = await request({
//     url: 'http://localhost:3002/asset/types',
//   });
//   return z.array(typeSchema).parse(data);
// };

// const modelSchema = z.object({
//   id: z.number(),
//   name: z.string(),
// });

//TODO: remove onBlur since it's not used inside Input
// export const getModelsByType = async (typeId: number | null) => {
//   const data = await request({
//     url: 'http://localhost:3002/asset/models',
//     data: {
//       type_id: typeId,
//     },
//   });
//   return z.array(modelSchema).parse(data);
// };

// const assetNameSchema = z.object({
//   id: z.number(),
//   name: z.string(),
// });

//TODO: remove onBlur since it's not used inside Input
// export const getAssetNames = async (
//   cellId: number,
//   typeId: number | null,
//   modelId: number | null
// ) => {
//   const data = await request({
//     url: 'http://localhost:3002/asset/names',
//     data: {
//       cell_id: cellId,
//       type_id: typeId,
//       model_id: modelId,
//     },
//   });
//   return z.array(assetNameSchema).parse(data);
// };
