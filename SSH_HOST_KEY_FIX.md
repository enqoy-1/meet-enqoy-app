# Fix SSH Host Key Changed Warning

This warning appears when the VPS host key has changed (usually after reinstallation or server replacement).

## Quick Fix (Windows PowerShell)

### Option 1: Remove the specific line (Recommended)
```powershell
# Remove the offending key for this IP
ssh-keygen -R 75.119.156.107
```

### Option 2: Manually edit the file
```powershell
# Open the known_hosts file
notepad C:\Users\Lu\.ssh\known_hosts

# Delete line 4 (the one mentioned in the error)
# Save and close
```

### Option 3: Remove all keys for this IP
```powershell
# Remove all keys for this IP address
(Get-Content C:\Users\Lu\.ssh\known_hosts) | Where-Object { $_ -notmatch '75.119.156.107' } | Set-Content C:\Users\Lu\.ssh\known_hosts
```

## After Fixing

Try connecting again:
```powershell
ssh root@75.119.156.107
```

You'll be asked to accept the new host key - type `yes` to continue.

## Why This Happens

- VPS was reinstalled/reformatted
- Server was replaced by provider
- SSH keys were regenerated

This is normal and safe if you know the server was reinstalled.

## Security Note

If you didn't reinstall the server, this could indicate:
- A man-in-the-middle attack (unlikely but possible)
- Server compromise

Since you're setting up a new VPS, this is expected behavior.

