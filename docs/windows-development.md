# Pre-Fab Windows Development VM

Ops maintains a Windows development image with all the software needed for VSC
and VS development of CodeStream.


## Launch a VM

Windows servers should be launched using the EZ-Launcher with the command:
```
dt-vm --ez-launch unmanaged:windows
```

The EZ launcher will list the available image profiles to use (see list). All
have had their Administrator passwords reset so no ssh key or EC2 console access
is required to connect to them once launched. Simply install **MS Remote
Desktop** (available in the App Store for OSX). It's recommended that you change
your VM's Administrator password once launched.

_No software licenses or ssh keys are installed on these images. You'll need to
install your private files once you've launched your VM and changed the
Administrator password._

The EZ launcher will tell you the Administrator password once the VM is
launched.

| Name | Desc |
| --- | --- |
| Win2022Base | Encrypted, base windows image |
| Win2022Dev | Encrypted, development software (git, node, vsc, vs, ...) |
| Win2016Base | (deprecated) Base windows image |
| Win2016VSExtBuildTCAgent | (deprecated) Suitable for CI/CD builds as TeamCity agent (connecting to `teamcity.codestream.us`) |

Don't leave your personal VM's running 24x7. Stop them when you're not using
them as they are expensive over time.


## Setup your VM for CodeStream Development

Brian's Notes:

- a new machine might need to change the powershell execution policy, change it
  with this command from an elevated PowerShell:
  ```
  > Set-ExecutionPolicy Unrestricted
  ```

- From the Start menu, search for "Folder options", from "View", uncheck "Hide
  extensions for known file types" and Save or your pain will be legendary even
  in hell.

- NOTE: I have exported the 3 VS-related installs to several *.vsconfig files in
  the Administrator's Downloads folder. This will allow future VS-related
  installs to import this config, rather than clicking through various
  workloads/extension-packs in the UI.
