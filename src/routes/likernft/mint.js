import { Router } from 'express';
import { filterLikeNFTISCNData } from '../../util/ValidationHelper';
import { ValidationError } from '../../util/ValidationError';
import { likeNFTCollection } from '../../util/firebase';
import { getISCNOwner } from '../../util/cosmos/iscn';
import {
  getISCNPrefixDocName,
  parseNFTInformationFromTxHash,
  getNFTsByClassId,
  getNFTClassIdByISCNId,
  writeMintedFTInfo,
} from '../../util/api/likernft/mint';

const router = Router();

router.get(
  '/mint',
  async (req, res, next) => {
    try {
      const { iscn_id: iscnId } = req.query;
      if (!iscnId) throw new ValidationError('MISSING_ISCN_ID');
      const iscnPrefix = getISCNPrefixDocName(iscnId);
      const likeNFTDoc = await likeNFTCollection.doc(iscnPrefix).get();
      const data = likeNFTDoc.data();
      if (!data) {
        res.sendStatus(404);
        return;
      }
      res.json(filterLikeNFTISCNData(data));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/mint',
  async (req, res, next) => {
    try {
      const {
        iscn_id: iscnId,
        tx_hash: txHash,
        class_id: inputClassId,
      } = req.query;
      if (!iscnId) throw new ValidationError('MISSING_ISCN_ID');
      const iscnPrefix = getISCNPrefixDocName(iscnId);
      const likeNFTDoc = await likeNFTCollection.doc(iscnPrefix).get();
      const likeNFTdata = likeNFTDoc.data();
      if (likeNFTdata) {
        res.sendStatus(409);
        return;
      }

      let classId = inputClassId;
      let sellerWallet;
      if (txHash) {
        const info = await parseNFTInformationFromTxHash(txHash);
        if (info) {
          const {
            classId: resClassId,
            fromWallet,
          } = info;
          if (classId && classId !== resClassId) throw new ValidationError('CLASS_ID_NOT_MATCH_TX');
          classId = resClassId;
          sellerWallet = fromWallet;
        }
      }
      if (!classId) {
        classId = await getNFTClassIdByISCNId(iscnId);
      }
      if (!classId) throw new ValidationError('CANNOT_FETCH_CLASS_ID');
      if (!sellerWallet) {
        sellerWallet = await getISCNOwner(iscnId);
      }
      const {
        total,
        nfts,
      } = await getNFTsByClassId(classId);
      if (!total || !nfts[0]) throw new ValidationError('NFT_NOT_RECEIVED');

      await writeMintedFTInfo(iscnId, sellerWallet, {
        classId,
        totalCount: total,
        uri: nfts[0].uri,
      }, nfts);

      res.json({
        classId,
        iscnId,
        nftCount: nfts.length,
        sellerWallet,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;