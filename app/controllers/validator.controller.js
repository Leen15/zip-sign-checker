const extract = require('extract-zip');
const { promises: fs } = require("fs");
const { createHash } = require('crypto');
const crypto = require('crypto');
const BASE_PATH = "/tmp/zip-sign-checker_";

exports.checkZip = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send({success: false, message:'No file was uploaded.'});
    }

    if (!req.body.pubKey) {
        return res.status(422).send({success: false, message: 'No public key in params.'});
    }
    
    publicKey = req.body.pubKey;
    console.log(publicKey);

    let zipFile = req.files.zipFile;
    if (!zipFile)
    {
        return res.status(422).send({success: false, message: "File upload failed, try again."});
    }
    if (zipFile.mimetype != 'application/zip') {
        return res.status(422).send({success: false, message: "File format not valid, it should be a zip file. (" + zipFile.mimetype + ")"});
    }

    console.log(req.files.zipFile.name);

    let storedFileName = BASE_PATH + (new Date()).getTime() + "_" + req.files.zipFile.name;
    let targetDir = storedFileName.slice(0, -4);

    // move file to tmp for extract it
    try {
      await zipFile.mv(storedFileName);
    }
    catch {
      return res.status(500).send({success: false, message: "Internal error. (cannot move file for extract it)."});
    }

    // extract main zip file
    let extracted = await extractZip(storedFileName, targetDir);
    if (!extracted) {
      return res.status(422).send({success: false, message: "Invalid zip file."});
    }

    // read archive content
    let files;
    try {
      files = await fs.readdir(targetDir);
    } catch (e) {
      return res.status(500).send({success: false, message: "Internal error. (cannot read extracted zip)."});
    }

    // find internal zip file
    const internalZipFile = files.filter(el => /\.zip$/.test(el))[0];
    console.log(internalZipFile);
    if (!internalZipFile) {
      console.log(files)
      return res.status(422).send({success: false, message: "Cannot find a zip file inside the archive"});
    }

    // calculate md5 of the zip file
    //const md5zipFile = md5File.sync(targetDir + "/" + internalZipFile)
    const internalZipFileContent = await fs.readFile(targetDir + "/" + internalZipFile);
    const md5zipFile = createHash('md5').update(internalZipFileContent).digest('hex');
    console.log("zip md5     :", md5zipFile);


    // get md5 file value
    const internalmd5File = files.filter(el => /\.md5$/.test(el))[0];
    if (!internalmd5File) {
      return res.status(422).send({success: false, message: "Cannot find a md5 file inside the archive"});
    }
    const md5checksum = await fs.readFile(targetDir + "/" + internalmd5File,  "utf8");
    console.log("md5 checksum:", md5checksum);

    // check md5 checksum
    if (md5zipFile != md5checksum) {
      return res.status(422).send({success: false, message: "md5 validation of the zip file is failed."});
    }
    
    // get signature file value
    const internalsignatureFile = files.filter(el => /\.signature$/.test(el))[0];
    if (!internalsignatureFile) {
      return res.status(422).send({success: false, message: "Cannot find a signature file inside the archive"});
    }
    const signature = await fs.readFile(targetDir + "/" + internalsignatureFile,  "utf8");
    if (!signature) {
      return res.status(422).send({success: false, message: "Signature file is empty."});
    }
    // console.log(signature);
     try {
         var pub = crypto.createPublicKey({key: publicKey});
    //   // const signatureBuffer = Buffer.from(signature, 'base64')
    //   // var clr = crypto.publicDecrypt(pub, signatureBuffer)
    //   // console.log(clr.toString('hex'));

    //   // var decipher = crypto.createDecipher('sha256',pubKey)
    //   // var dec = decipher.update(signature,'hex','utf8')
    //   // dec += decipher.final('utf8');
    //   // console.log(dec);
      
    //   // const verify = crypto.createVerify('SHA256');
    //   // verify.write(md5checksum);
    //   // verify.end();
    //   // console.log(verify.verify(pubKey, signature)) //, 'hex'));


    //   let result = crypto.verify(null, Buffer.from(md5checksum), pubKey, Buffer.from(signature))
    //   console.log(result);
    } catch (e) {
       console.log(e);
    }
    

    // extract internal zip file
    const internalZipFullPath = targetDir + "/" + internalZipFile;
    targetDirInternalZip = internalZipFullPath.slice(0, -4)
    extracted = await extractZip(internalZipFullPath, targetDirInternalZip);
    if (!extracted) {
      return res.status(422).send({success: false, message: "Invalid internal zip file."});
    }
    let internalzipFiles;
    try {
      internalzipFiles = await fs.readdir(targetDirInternalZip);
    } catch (e) {
      return res.status(500).send({success: false, message: "Internal error. (cannot read extracted internal zip)."});
    }
    console.log(internalzipFiles);

    const ret = {
      success: true, 
      internalzipFiles,
      targetDirInternalZip: targetDirInternalZip.replace("/tmp/zip-sign-checker_", ""),
      message: "validation ok."
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