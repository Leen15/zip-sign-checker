const { promises: fs } = require("fs");
const BASE_PATH = "/tmp/zip-sign-checker_";

exports.readInternalFile = async (req, res) => {
  try {
    // console.log(req.body)

    if (!req.body.path) {
        return res.status(422).send({success: false, message: 'No path in params.'});
    }
    
    if (!req.body.fileName) {
        return res.status(422).send({success: false, message: 'No fileName in params.'});
    }

    const file = await fs.readFile(BASE_PATH + req.body.path + "/" + req.body.fileName,  "utf8");
    if (!file) {
      return res.status(422).send({success: false, message: "file is empty."});
    }
    
    const ret = {
      success: true, 
      fileContent: file
    }
    res.send(ret);
  }
  catch(err) {
    return res.status(err.code || 500).send({
      message: err.message
    });
  }
};


async function extractZip (source, target) {
  try {
    await extract(source, { dir: target })
    return true;
  } catch (err) {
    return false;
  }
}

const getSignatureVerifyResult = (input, pubKey) => {

  let publicKey = pubKey.toString('ascii')
  const verifier = crypto.createVerify('RSA-SHA256')

  verifier.update(input, 'ascii')

  const publicKeyBuf = Buffer.from(publicKey, 'ascii')
  const signatureBuf = Buffer.from(input, 'ascii')
  const result = verifier.verify(publicKeyBuf, signatureBuf)

  return result;
}